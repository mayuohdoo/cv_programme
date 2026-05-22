@echo off
cd /d "C:\Users\Lenovo\Desktop\coding girls\cv_programme"
git status --short > _git_status_output.txt 2>&1
git diff --name-only > _git_diff_output.txt 2>&1
git diff main --name-only > _git_diff_vs_main.txt 2>&1
echo DONE
