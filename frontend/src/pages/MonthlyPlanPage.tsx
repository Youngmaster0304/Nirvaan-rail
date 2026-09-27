import { PlanWorkbench } from '../components/PlanWorkbench';

export default function MonthlyPlanPage() {
  return (
    <PlanWorkbench
      horizon="monthly"
      title="Monthly Programme"
      titleHi="मासिक कार्यक्रम"
      defaultDays={30}
    />
  );
}
