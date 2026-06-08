from django.apps import AppConfig


class CommunicationConfig(AppConfig):
    name = 'communication'

    def ready(self):
        import communication.signals
