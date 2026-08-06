-- AddForeignKey
ALTER TABLE "report_access_logs" ADD CONSTRAINT "report_access_logs_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
