ALTER TABLE "daily_tasks"
ADD COLUMN "task_source" VARCHAR(20) NOT NULL DEFAULT 'home';

CREATE INDEX "idx_daily_tasks_user_source_date"
ON "daily_tasks"("user_id", "task_source", "task_date");
