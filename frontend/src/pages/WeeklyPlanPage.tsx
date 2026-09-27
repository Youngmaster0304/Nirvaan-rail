import { PlanWorkbench } from '../components/PlanWorkbench';

export default function WeeklyPlanPage() {
  return (
    <PlanWorkbench
      horizon="weekly"
      title="Weekly Programme"
      titleHi="साप्ताहिक कार्यक्रम"
      defaultDays={7}
    />
  );
}
