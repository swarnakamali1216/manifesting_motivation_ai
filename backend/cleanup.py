"""
backend/cleanup.py

Run this ONCE from your backend folder to delete all the junk files:
  cd manifesting-motivation-ai/backend
  python cleanup.py

It will LIST what it's about to delete, ask for confirmation, then delete.
Safe: it never touches routes/, models.py, app.py, .env, requirements.txt
"""
import os, sys

# Files safe to delete — debug, migration, fix, and test scripts
JUNK_FILES = [
    # Debug/test scripts
    "debug_motivate.py",
    "diagnose.py",
    "email_debug.py",
    "email_test.py",
    "startup_check.py",
    "check_encryption.py",
    "config.py",
    "motivation_ai.py",       # old duplicate of routes/motivation.py

    # One-time migration/fix scripts (already applied)
    "fix_adaptive_direct.py",
    "fix_adaptive_prove.py",
    "fix_db.py",
    "fix_db2.py",
    "fix_goal_steps.py",
    "fix_postgres_columns.py",
    "fix_sessions_table.py",
    "fix_vader_score_column.py",
    "make_admin.py",
    "migrate_db.py",
    "migrate_recursive.py",
    "migrate_to_postgres.py",
    "encrypt_journals.py",

    # Database files that don't belong in root
    "motivation.db",          # old SQLite (replaced by PostgreSQL)
]

# Folders safe to delete
JUNK_DIRS = [
    "__pycache__",
    "backend",                # nested /backend/backend folder
]

def main():
    base = os.path.dirname(os.path.abspath(__file__))
    
    print("\n🔍 Scanning for files to delete...\n")
    
    to_delete_files = []
    to_delete_dirs  = []
    
    for fname in JUNK_FILES:
        fpath = os.path.join(base, fname)
        if os.path.exists(fpath):
            size = os.path.getsize(fpath)
            to_delete_files.append((fpath, fname, size))

    for dname in JUNK_DIRS:
        dpath = os.path.join(base, dname)
        if os.path.isdir(dpath):
            # Count files in dir
            count = sum(len(files) for _, _, files in os.walk(dpath))
            to_delete_dirs.append((dpath, dname, count))

    if not to_delete_files and not to_delete_dirs:
        print("✅ Nothing to clean up — workspace is already tidy!")
        return

    print("FILES to delete:")
    for fpath, fname, size in to_delete_files:
        print(f"  🗑  {fname}  ({size:,} bytes)")

    if to_delete_dirs:
        print("\nFOLDERS to delete:")
        for dpath, dname, count in to_delete_dirs:
            print(f"  🗑  {dname}/  ({count} files)")

    print(f"\nTotal: {len(to_delete_files)} files + {len(to_delete_dirs)} folders")
    print("\n⚠️  These are one-time scripts that have already been applied.")
    print("   Your app.py, models.py, .env, routes/, requirements.txt are SAFE.\n")

    answer = input("Type 'yes' to delete, anything else to cancel: ").strip().lower()
    if answer != "yes":
        print("Cancelled. Nothing deleted.")
        return

    import shutil

    deleted = 0
    errors  = 0

    for fpath, fname, _ in to_delete_files:
        try:
            os.remove(fpath)
            print(f"  ✅ Deleted {fname}")
            deleted += 1
        except Exception as e:
            print(f"  ❌ Could not delete {fname}: {e}")
            errors += 1

    for dpath, dname, _ in to_delete_dirs:
        try:
            shutil.rmtree(dpath)
            print(f"  ✅ Deleted {dname}/")
            deleted += 1
        except Exception as e:
            print(f"  ❌ Could not delete {dname}/: {e}")
            errors += 1

    print(f"\n{'✅' if not errors else '⚠️'} Done: {deleted} deleted, {errors} errors")

if __name__ == "__main__":
    main()