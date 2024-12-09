// modules_v2/uiModules/LoadingScreen.js

export class LoadingScreen {
    constructor() {
      this.loadingMessage = this.createLoadingMessage();
    }
  
    /**
     * Create and display a loading message on the screen.
     * @returns {HTMLElement} The loading message element.
     */
    createLoadingMessage() {
      const loadingMessage = document.createElement('div');
      loadingMessage.textContent = 'Loading...';
      Object.assign(loadingMessage.style, {
        color: 'white',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '1000',
        fontSize: '1.5em',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '20px',
        borderRadius: '8px',
      });
      document.body.appendChild(loadingMessage);
      return loadingMessage;
    }
  
    /**
     * Remove the loading message from the DOM.
     */
    remove() {
      if (this.loadingMessage) {
        this.loadingMessage.remove();
        this.loadingMessage = null;
      }
    }
  
    /**
     * Update the loading message text.
     * @param {string} message - The new loading message.
     */
    updateMessage(message) {
      if (this.loadingMessage) {
        this.loadingMessage.textContent = message;
      }
    }
  }
  