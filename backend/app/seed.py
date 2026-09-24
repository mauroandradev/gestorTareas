from .db.seed import seed_initial_data

# Alias for backward compatibility
seed_initial_tasks = seed_initial_data

__all__ = ["seed_initial_data", "seed_initial_tasks"]
