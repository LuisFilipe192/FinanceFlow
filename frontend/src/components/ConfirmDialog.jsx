import Modal from "./Modal";

function ConfirmDialog({
    title,
    description,
    confirmLabel,
    loadingLabel,
    loading = false,
    error,
    onConfirm,
    onCancel,
}) {
    return (
        <Modal
            title={title}
            description={description}
            onClose={onCancel}
            closeDisabled={loading}
        >
            {error && <p className="form-error">{error}</p>}

            <div className="modal-actions">
                <button
                    type="button"
                    className="secondary-button"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    className="danger-button"
                    onClick={onConfirm}
                    disabled={loading}
                >
                    {loading ? loadingLabel : confirmLabel}
                </button>
            </div>
        </Modal>
    );
}

export default ConfirmDialog;
