from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("transactions", "0008_transaction_category_restrict"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "CREATE UNIQUE INDEX transactions_unique_user_email "
                "ON auth_user (LOWER(email)) WHERE email <> '';"
            ),
            reverse_sql="DROP INDEX transactions_unique_user_email;",
        ),
    ]
