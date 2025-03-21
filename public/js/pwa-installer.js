// PWA installation handler
const pwaInstaller = {
    deferredPrompt: null,
    installButton: null,
    
    // Initialize the PWA installer
    init() {
      // Listen for 'beforeinstallprompt' event
      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome from automatically showing the prompt
        e.preventDefault();
        
        // Stash the event so it can be triggered later
        this.deferredPrompt = e;
        
        // Create and show the install button
        this.showInstallButton();
      });
    },
    
    // Show the install button
    showInstallButton() {
      // Create the button if it doesn't exist
      if (!this.installButton) {
        this.installButton = document.createElement('button');
        this.installButton.id = 'install-button';
        this.installButton.textContent = 'Install App';
        
        this.installButton.addEventListener('click', (e) => {
          this.promptInstall();
        });
        
        document.body.appendChild(this.installButton);
      }
    },
    
    // Show the install prompt
    promptInstall() {
      if (!this.deferredPrompt) return;
      
      // Show the install prompt
      this.deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        
        // Clear the saved prompt since it can't be used twice
        this.deferredPrompt = null;
        
        // Remove the button
        if (this.installButton) {
          this.installButton.remove();
          this.installButton = null;
        }
      });
    }
  };
  
  // Initialize the PWA installer
  document.addEventListener('DOMContentLoaded', () => {
    pwaInstaller.init();
  });