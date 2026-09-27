from typing import List, Dict, Any

class ExplainabilityEngine:
    """Human-readable explanation engine."""
    
    def explain_priority(self, task: Dict[str, Any], score: float, shap_values: Dict[str, float], policy_overrides: List[str]) -> str:
        """Explain AI prioritization."""
        exp = f"Task {task.get('id', 'Unknown')} prioritized with score {score:.1f}/100 because:\n"
        for k, v in shap_values.items():
            exp += f" - {k.replace('_', ' ').capitalize()} (+{v:.1f} contribution)\n"
        if policy_overrides:
            for p in policy_overrides:
                exp += f" - Policy override applied: '{p}'\n"
        exp += "Final recommendation: Schedule in next available block window."
        return exp

    def explain_merge(self, merge_group: Dict[str, Any]) -> str:
        """Explain block merging logic."""
        task_ids = merge_group.get('task_ids', [])
        t_str = " and ".join(task_ids)
        sec = merge_group.get('section_id', 'Unknown')
        dur = merge_group.get('combined_duration', 0)
        sav = merge_group.get('savings_hours', 0.0)
        
        return f"Tasks {t_str} merged because:\n" \
               f" - Both located on Section {sec}\n" \
               f" - Compatible safety constraints\n" \
               f" - Combined duration ({dur/60:.1f} hrs) within 6-hour block limit\n" \
               f" - Estimated savings: {sav:.1f} hours of corridor downtime"

    def explain_block_plan(self, plan: Dict[str, Any]) -> str:
        """Explain full block plan."""
        return f"Block plan generated with {len(plan.get('blocks', []))} blocks maximizing throughput."

    def explain_simulation(self, result: Dict[str, Any]) -> str:
        """Explain simulation impacts."""
        ai_del = result.get('avg_delay_minutes', 0)
        no_ai_del = result.get('comparison_without_ai', {}).get('avg_delay_minutes', 0)
        saved = max(0, no_ai_del - ai_del)
        return f"Simulation shows average delay of {ai_del:.1f} mins per affected train. " \
               f"This represents {saved:.1f} mins saved compared to uncoordinated scheduling."
