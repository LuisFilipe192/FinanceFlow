import { useEffect, useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import DatePicker from "react-datepicker";
import { ptBR } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

import EmptyState from "../components/EmptyState";
import PageActions from "../components/PageActions";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import { downloadStatementCsv, getStatement } from "../services/statement";
import { formatCurrency, formatDate, formatDateToISO, parseISODate, pluralize } from "../utils/format";
import { getPresetRange, STATEMENT_PRESETS } from "../utils/statement";

const TYPE_FILTERS = [
    { value: "ALL", label: "Todas" },
    { value: "INCOME", label: "Receitas" },
    { value: "EXPENSE", label: "Despesas" },
];

function Statement() {
    const showToast = useToast();

    const [preset, setPreset] = useState("this-month");
    const [dates, setDates] = useState(() => getPresetRange("this-month"));
    const [type, setType] = useState("ALL");
    const [statement, setStatement] = useState(null);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(false);

    const { start, end } = dates;
    const hasDates = Boolean(start && end);
    const invalidRange = hasDates && start > end;
    const canLoad = hasDates && !invalidRange;

    useEffect(() => {
        if (!canLoad) return undefined;

        const controller = new AbortController();

        getStatement({ start, end, type }, { signal: controller.signal })
            .then((data) => {
                setStatement(data);
                setError("");
            })
            .catch((requestError) => {
                if (requestError.name === "AbortError") return;

                console.error(requestError);
                setStatement(null);
                setError(requestError.message);
            });

        return () => controller.abort();
    }, [start, end, type, canLoad]);

    function choosePreset(value) {
        setPreset(value);
        setDates(getPresetRange(value));
    }

    function changeDate(field, date) {
        setPreset("");
        setDates((previous) => ({ ...previous, [field]: date ? formatDateToISO(date) : "" }));
    }

    async function exportCsv() {
        try {
            setExporting(true);
            await downloadStatementCsv({ start, end, type });
            showToast({ type: "success", message: "Extrato exportado." });
        } catch (exportError) {
            console.error(exportError);
            showToast({ type: "error", message: exportError.message });
        } finally {
            setExporting(false);
        }
    }

    const transactions = statement?.transactions ?? [];
    const canExport = canLoad && transactions.length > 0;

    function renderContent() {
        if (invalidRange) {
            return (
                <EmptyState
                    icon={<FileText size={24} />}
                    title="Confira as datas"
                    description="A data inicial precisa vir antes da data final."
                />
            );
        }

        if (!hasDates) {
            return (
                <EmptyState
                    icon={<FileText size={24} />}
                    title="Escolha um período"
                    description="Preencha as duas datas para ver o extrato."
                />
            );
        }

        if (error) {
            return <EmptyState icon={<FileText size={24} />} title="Algo deu errado" description={error} />;
        }

        if (!statement) return <SkeletonRows />;

        if (transactions.length === 0) {
            return (
                <EmptyState
                    icon={<FileText size={24} />}
                    title="Nada neste período"
                    description="Escolha outro período ou tipo para ver suas transações."
                />
            );
        }

        return (
            <table className="statement-table">
                <thead>
                    <tr>
                        <th scope="col">Data</th>
                        <th scope="col">Descrição</th>
                        <th scope="col">Valor</th>
                    </tr>
                </thead>

                <tbody>
                    {transactions.map((transaction) => {
                        const isIncome = transaction.type === "INCOME";

                        return (
                            <tr key={transaction.id}>
                                <td>{formatDate(transaction.date)}</td>

                                <td>
                                    <strong>{transaction.description}</strong>
                                    <small>
                                        {transaction.category_name || "Sem categoria"}
                                        {transaction.installment_total &&
                                            ` - Parcela ${transaction.installment_number} de ${transaction.installment_total}`}
                                    </small>
                                </td>

                                <td className={isIncome ? "income" : "expense"}>
                                    {isIncome ? "+" : "−"} {formatCurrency(transaction.amount)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    }

    return (
        <>
            <PageActions>
                <button type="button" className="secondary-button" disabled={!canExport} onClick={() => window.print()}>
                    <Printer size={16} />
                    Imprimir ou PDF
                </button>

                <button type="button" className="primary-button" disabled={!canExport || exporting} onClick={exportCsv}>
                    <Download size={16} />
                    {exporting ? "Exportando..." : "Baixar CSV"}
                </button>
            </PageActions>

            <section className="statement-page">
                <div className="transactions-table-card statement-filters">
                    <div className="segmented-control" role="group" aria-label="Período">
                        {STATEMENT_PRESETS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={preset === option.value ? "active" : ""}
                                aria-pressed={preset === option.value}
                                onClick={() => choosePreset(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <div className="statement-filter-row">
                        <div className="statement-date">
                            <label htmlFor="statement-start">De</label>
                            <DatePicker
                                id="statement-start"
                                autoComplete="off"
                                selected={start ? parseISODate(start) : null}
                                onChange={(date) => changeDate("start", date)}
                                locale={ptBR}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Data inicial"
                                showPopperArrow={false}
                            />
                        </div>

                        <div className="statement-date">
                            <label htmlFor="statement-end">Até</label>
                            <DatePicker
                                id="statement-end"
                                autoComplete="off"
                                selected={end ? parseISODate(end) : null}
                                onChange={(date) => changeDate("end", date)}
                                locale={ptBR}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Data final"
                                showPopperArrow={false}
                            />
                        </div>

                        <div className="segmented-control" role="group" aria-label="Tipo">
                            {TYPE_FILTERS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={type === option.value ? "active" : ""}
                                    aria-pressed={type === option.value}
                                    onClick={() => setType(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="transactions-table-card statement-card">
                    <div className="statement-print-title">
                        <strong>Extrato FinanceFlow</strong>
                        {canLoad && <span>{formatDate(start)} a {formatDate(end)}</span>}
                    </div>

                    {canLoad && statement && (
                        <dl className="statement-summary">
                            <div>
                                <dt>Entradas</dt>
                                <dd className="income">{formatCurrency(statement.summary.income)}</dd>
                            </div>

                            <div>
                                <dt>Saídas</dt>
                                <dd className="expense">{formatCurrency(statement.summary.expenses)}</dd>
                            </div>

                            <div>
                                <dt>Saldo do período</dt>
                                <dd>{formatCurrency(statement.summary.balance)}</dd>
                            </div>

                            <div>
                                <dt>Movimentações</dt>
                                <dd>{pluralize(transactions.length, "transação", "transações")}</dd>
                            </div>
                        </dl>
                    )}

                    {renderContent()}
                </div>
            </section>
        </>
    );
}

export default Statement;
