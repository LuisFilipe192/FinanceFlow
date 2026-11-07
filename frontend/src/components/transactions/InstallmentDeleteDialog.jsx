import Modal from "../Modal";

function InstallmentDeleteDialog({ transaction, loading, error, onDeleteOne, onDeleteFollowing, onCancel }) {
    const { description, installment_number: number, installment_total: total } = transaction;
    const keepsEarlier = number > 1 ? " As parcelas anteriores continuam registradas." : "";

    return (
        <Modal
            title="Excluir parcela?"
            description={`"${description}" é a parcela ${number} de ${total}.${keepsEarlier}`}
            onClose={onCancel}
            closeDisabled={loading}
        >
            {error && <p className="form-error">{error}</p>}

            <div className="modal-actions installment-delete-actions">
                <button type="button" className="secondary-button" onClick={onCancel} disabled={loading}>
                    Cancelar
                </button>

                <button type="button" className="secondary-button" onClick={onDeleteOne} disabled={loading}>
                    Só esta parcela
                </button>

                <button type="button" className="danger-button" onClick={onDeleteFollowing} disabled={loading}>
                    {loading ? "Excluindo..." : "Esta e as próximas"}
                </button>
            </div>
        </Modal>
    );
}

export default InstallmentDeleteDialog;
