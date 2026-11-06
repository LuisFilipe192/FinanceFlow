from django.core.mail.backends.console import EmailBackend


class ReadableConsoleEmailBackend(EmailBackend):
    def write_message(self, message):
        self.stream.write(f"Para: {', '.join(message.to)}\n")
        self.stream.write(f"Assunto: {message.subject}\n\n")
        self.stream.write(f"{message.body}\n")
        self.stream.write("-" * 79)
        self.stream.write("\n")
