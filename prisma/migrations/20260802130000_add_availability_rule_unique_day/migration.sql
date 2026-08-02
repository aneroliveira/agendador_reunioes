-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityRule_eventTypeId_dayOfWeek_key" ON "AvailabilityRule"("eventTypeId", "dayOfWeek");
