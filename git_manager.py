import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import subprocess
import os
import threading
from pathlib import Path

class GitManager:
    def __init__(self, root):
        self.root = root
        self.root.title("Git Repository Manager - مدير المستودعات")
        self.root.geometry("800x600")
        self.root.configure(bg='#2c3e50')
        
        # Variables
        self.current_directory = tk.StringVar()
        self.repo_url = tk.StringVar()
        self.commit_message = tk.StringVar(value="تحديث الملفات")
        
        self.setup_ui()
        
    def setup_ui(self):
        # Main frame
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="Git Repository Manager", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Directory selection
        ttk.Label(main_frame, text="مجلد المشروع:").grid(row=1, column=0, sticky=tk.W, pady=5)
        ttk.Entry(main_frame, textvariable=self.current_directory, width=50).grid(row=1, column=1, sticky=(tk.W, tk.E), padx=5)
        ttk.Button(main_frame, text="تصفح", command=self.browse_directory).grid(row=1, column=2, padx=5)
        
        # Repository URL
        ttk.Label(main_frame, text="رابط المستودع:").grid(row=2, column=0, sticky=tk.W, pady=5)
        ttk.Entry(main_frame, textvariable=self.repo_url, width=50).grid(row=2, column=1, sticky=(tk.W, tk.E), padx=5)
        
        # Commit message
        ttk.Label(main_frame, text="رسالة التحديث:").grid(row=3, column=0, sticky=tk.W, pady=5)
        ttk.Entry(main_frame, textvariable=self.commit_message, width=50).grid(row=3, column=1, sticky=(tk.W, tk.E), padx=5)
        
        # Buttons frame
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.grid(row=4, column=0, columnspan=3, pady=20)
        
        # Action buttons
        ttk.Button(buttons_frame, text="🔄 فحص حالة Git", 
                  command=self.check_git_status).pack(side=tk.LEFT, padx=5)
        ttk.Button(buttons_frame, text="📁 إنشاء مستودع جديد", 
                  command=self.init_repo).pack(side=tk.LEFT, padx=5)
        ttk.Button(buttons_frame, text="🔗 ربط مستودع موجود", 
                  command=self.add_remote).pack(side=tk.LEFT, padx=5)
        ttk.Button(buttons_frame, text="⬆️ رفع التحديثات", 
                  command=self.push_updates).pack(side=tk.LEFT, padx=5)
        
        # Additional buttons frame
        buttons_frame2 = ttk.Frame(main_frame)
        buttons_frame2.grid(row=5, column=0, columnspan=3, pady=10)
        
        ttk.Button(buttons_frame2, text="📥 سحب التحديثات", 
                  command=self.pull_updates).pack(side=tk.LEFT, padx=5)
        ttk.Button(buttons_frame2, text="🌿 إنشاء فرع جديد", 
                  command=self.create_branch).pack(side=tk.LEFT, padx=5)
        ttk.Button(buttons_frame2, text="🔄 تغيير الفرع", 
                  command=self.switch_branch).pack(side=tk.LEFT, padx=5)
        ttk.Button(buttons_frame2, text="🗂️ عرض الفروع", 
                  command=self.list_branches).pack(side=tk.LEFT, padx=5)
        
        # Output area
        ttk.Label(main_frame, text="سجل العمليات:").grid(row=6, column=0, sticky=tk.W, pady=(20, 5))
        
        self.output_text = scrolledtext.ScrolledText(main_frame, height=15, width=80)
        self.output_text.grid(row=7, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        
        # Configure text colors
        self.output_text.tag_configure("success", foreground="green")
        self.output_text.tag_configure("error", foreground="red")
        self.output_text.tag_configure("info", foreground="blue")
        
        # Progress bar
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate')
        self.progress.grid(row=8, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)
        
        # Configure grid weights for resizing
        main_frame.rowconfigure(7, weight=1)
        
    def browse_directory(self):
        directory = filedialog.askdirectory()
        if directory:
            self.current_directory.set(directory)
            self.log_message(f"تم اختيار المجلد: {directory}", "info")
    
    def log_message(self, message, tag="info"):
        self.output_text.insert(tk.END, f"{message}\n", tag)
        self.output_text.see(tk.END)
        self.root.update()
    
    def run_git_command(self, command, success_message="", error_message=""):
        try:
            directory = self.current_directory.get()
            if not directory:
                self.log_message("❌ يرجى اختيار مجلد المشروع أولاً", "error")
                return False
            
            self.progress.start()
            self.log_message(f"🔄 تنفيذ الأمر: {command}", "info")
            
            result = subprocess.run(command, shell=True, cwd=directory, 
                                  capture_output=True, text=True, encoding='utf-8')
            
            if result.returncode == 0:
                if success_message:
                    self.log_message(f"✅ {success_message}", "success")
                if result.stdout:
                    self.log_message(result.stdout, "info")
                return True
            else:
                error_msg = error_message or f"فشل في تنفيذ الأمر: {command}"
                self.log_message(f"❌ {error_msg}", "error")
                if result.stderr:
                    self.log_message(result.stderr, "error")
                return False
                
        except Exception as e:
            self.log_message(f"❌ خطأ: {str(e)}", "error")
            return False
        finally:
            self.progress.stop()
    
    def check_git_status(self):
        def run_check():
            self.run_git_command("git status", "تم فحص حالة Git بنجاح")
            self.run_git_command("git remote -v", "عرض المستودعات المرتبطة")
        
        threading.Thread(target=run_check, daemon=True).start()
    
    def init_repo(self):
        def run_init():
            if self.run_git_command("git init", "تم إنشاء مستودع Git جديد"):
                if self.repo_url.get():
                    self.add_remote()
        
        threading.Thread(target=run_init, daemon=True).start()
    
    def add_remote(self):
        def run_add_remote():
            repo_url = self.repo_url.get()
            if not repo_url:
                self.log_message("❌ يرجى إدخال رابط المستودع", "error")
                return
            
            # Try to remove existing origin first
            self.run_git_command("git remote remove origin")
            
            # Add new origin
            if self.run_git_command(f"git remote add origin {repo_url}", 
                                  f"تم ربط المستودع: {repo_url}"):
                self.run_git_command("git remote -v", "المستودعات المرتبطة:")
        
        threading.Thread(target=run_add_remote, daemon=True).start()
    
    def push_updates(self):
        def run_push():
            commit_msg = self.commit_message.get() or "تحديث الملفات"
            
            # Add all files
            if not self.run_git_command("git add .", "تم إضافة جميع الملفات"):
                return
            
            # Commit changes
            if not self.run_git_command(f'git commit -m "{commit_msg}"', 
                                      f"تم حفظ التغييرات: {commit_msg}"):
                self.log_message("ℹ️ لا توجد تغييرات جديدة للحفظ", "info")
            
            # Push to remote
            self.run_git_command("git push origin main", "تم رفع التحديثات بنجاح")
        
        threading.Thread(target=run_push, daemon=True).start()
    
    def pull_updates(self):
        def run_pull():
            self.run_git_command("git pull origin main", "تم سحب التحديثات بنجاح")
        
        threading.Thread(target=run_pull, daemon=True).start()
    
    def create_branch(self):
        branch_name = tk.simpledialog.askstring("إنشاء فرع جديد", "اسم الفرع الجديد:")
        if branch_name:
            def run_create_branch():
                self.run_git_command(f"git checkout -b {branch_name}", 
                                   f"تم إنشاء الفرع: {branch_name}")
            
            threading.Thread(target=run_create_branch, daemon=True).start()
    
    def switch_branch(self):
        branch_name = tk.simpledialog.askstring("تغيير الفرع", "اسم الفرع:")
        if branch_name:
            def run_switch():
                self.run_git_command(f"git checkout {branch_name}", 
                                   f"تم التبديل إلى الفرع: {branch_name}")
            
            threading.Thread(target=run_switch, daemon=True).start()
    
    def list_branches(self):
        def run_list():
            self.run_git_command("git branch -a", "قائمة الفروع:")
        
        threading.Thread(target=run_list, daemon=True).start()

def main():
    root = tk.Tk()
    app = GitManager(root)
    
    # Set window icon and style
    try:
        root.iconbitmap("git.ico")  # Add icon if available
    except:
        pass
    
    # Configure ttk style
    style = ttk.Style()
    style.theme_use('clam')
    
    root.mainloop()

if __name__ == "__main__":
    # Import required modules
    try:
        import tkinter.simpledialog
    except ImportError:
        print("Installing required modules...")
        subprocess.run(["pip", "install", "tkinter"])
    
    main()
