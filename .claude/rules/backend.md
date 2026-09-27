# Backend Development Rules

## API Design
- **FastAPI**: Use dependency injection (`Depends`) for Database and Auth.
- **Async**: Always use `async`/`await` with `aiosqlite`.
- **Response Models**: Every endpoint must have a Pydantic `response_model` defined.
- **Error Handling**: Use `HTTPException` for expected failures; let FastAPI handle standard validation errors.

## ML & Data
- **Prioritization**: When modifying the LightGBM model, ensure feature engineering remains deterministic.
- **Policy Layer**: Any new safety overrides must be appended to `PolicyLayer.SAFETY_RULES` in `policy_layer.py`.
- **Optimization**: OR-Tools constraints must be kept under 30 seconds solving time limit.
