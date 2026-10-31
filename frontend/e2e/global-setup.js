import { createE2EUser, deleteE2EUsers } from "./support/users.js";

// Antes de tudo: remove sobras de uma execução interrompida e cria o
// usuário de teste do zero, sem transações nem categorias.
export default function globalSetup() {
    deleteE2EUsers();
    createE2EUser();
}
