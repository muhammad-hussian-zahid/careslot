"""Create CareSlot tables and PostgreSQL booking exclusion constraint."""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("full_name", sa.String(160), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])
    op.create_table("specialties", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(100), nullable=False, unique=True), sa.Column("description", sa.Text(), nullable=False, server_default=""))
    op.create_table("doctor_profiles", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True), sa.Column("specialty_id", sa.Integer(), sa.ForeignKey("specialties.id"), nullable=False), sa.Column("bio", sa.Text(), nullable=False, server_default=""), sa.Column("consultation_minutes", sa.Integer(), nullable=False, server_default="30"))
    op.create_table("weekly_availability_rules", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False), sa.Column("weekday", sa.Integer(), nullable=False), sa.Column("start_time", sa.Time(), nullable=False), sa.Column("end_time", sa.Time(), nullable=False), sa.CheckConstraint("weekday BETWEEN 0 AND 6"), sa.CheckConstraint("end_time > start_time"))
    op.create_index("ix_weekly_availability_rules_doctor_id", "weekly_availability_rules", ["doctor_id"])
    op.create_table("time_off", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False), sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False), sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False), sa.Column("reason", sa.String(250), nullable=False, server_default=""))
    op.create_index("ix_time_off_doctor_id", "time_off", ["doctor_id"])
    op.create_table("appointments", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctor_profiles.id"), nullable=False), sa.Column("patient_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False), sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False), sa.Column("status", sa.String(20), nullable=False, server_default="pending"), sa.Column("reason", sa.String(500), nullable=False, server_default=""), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.CheckConstraint("ends_at > starts_at"))
    op.create_index("ix_appointments_doctor_id", "appointments", ["doctor_id"])
    op.create_index("ix_appointments_patient_id", "appointments", ["patient_id"])
    op.create_index("ix_appointments_starts_at", "appointments", ["starts_at"])
    op.create_index("ix_appointments_status", "appointments", ["status"])
    op.execute("ALTER TABLE appointments ADD CONSTRAINT exclude_overlapping_active_appointments EXCLUDE USING gist (doctor_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending', 'confirmed'))")
    op.create_table("refresh_tokens", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("token_hash", sa.String(64), nullable=False, unique=True), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.Column("revoked_at", sa.DateTime(timezone=True)))
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"])


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("appointments")
    op.drop_table("time_off")
    op.drop_table("weekly_availability_rules")
    op.drop_table("doctor_profiles")
    op.drop_table("specialties")
    op.drop_table("users")