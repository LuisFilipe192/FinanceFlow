import { deleteE2EUsers } from "./support/users.js";

// Depois de tudo: apaga os usuários de teste e, junto, os dados deles.
export default function globalTeardown() {
    deleteE2EUsers();
}
