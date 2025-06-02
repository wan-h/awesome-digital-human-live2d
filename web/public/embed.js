/** this file is used to embed the sentio in a website
 * the sentioConfig should be defined in the html file before this script is included
 * the sentioConfig should contain the token of the chatbot
 * the token can be found in the chatbot settings page
 */

// attention: This JavaScript script must be placed after the <body> element. Otherwise, the script will not work.

(function () {
  // Constants for DOM element IDs and configuration key
  const configKey = "sentioConfig";
  const buttonId = "sentio-bubble-button";
  const iframeId = "sentio-bubble-window";
  const config = window[configKey];

  // SVG icons for open and close states
  const svgIcons = {
    open: `<svg id="openIcon" width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M 12 2.25 C 6.613281 2.25 2.25 6.613281 2.25 12 L 2.25 13.875 C 2.25 14.5 1.75 15 1.125 15 C 0.5 15 0 14.5 0 13.875 L 0 12 C 0 5.371094 5.371094 0 12 0 C 18.628906 0 24 5.371094 24 12 L 24 18.753906 C 24 21.03125 22.152344 22.878906 19.871094 22.878906 L 14.699219 22.875 C 14.3125 23.546875 13.585938 24 12.75 24 L 11.25 24 C 10.007812 24 9 22.992188 9 21.75 C 9 20.507812 10.007812 19.5 11.25 19.5 L 12.75 19.5 C 13.585938 19.5 14.3125 19.953125 14.699219 20.625 L 19.875 20.628906 C 20.910156 20.628906 21.75 19.789062 21.75 18.753906 L 21.75 12 C 21.75 6.613281 17.386719 2.25 12 2.25 Z M 6.75 9.75 L 7.5 9.75 C 8.328125 9.75 9 10.421875 9 11.25 L 9 16.5 C 9 17.328125 8.328125 18 7.5 18 L 6.75 18 C 5.09375 18 3.75 16.65625 3.75 15 L 3.75 12.75 C 3.75 11.09375 5.09375 9.75 6.75 9.75 Z M 17.25 9.75 C 18.90625 9.75 20.25 11.09375 20.25 12.75 L 20.25 15 C 20.25 16.65625 18.90625 18 17.25 18 L 16.5 18 C 15.671875 18 15 17.328125 15 16.5 L 15 11.25 C 15 10.421875 15.671875 9.75 16.5 9.75 Z M 17.25 9.75 "/>
    </svg>`,
    close: `<svg id="closeIcon" width="24" height="24" viewBox="0 0 24 24" fill="none" >
      <path d="M18 18L6 6M6 18L18 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  };

  // Main function to embed the chatbot
  async function embedChatbot() {
    if (!config || !config.baseUrl || !config.appId) {
      console.error(`${configKey} is empty or token is not provided`);
      return;
    }

    // pre-check the length of the URL
    const iframeUrl = `${config.baseUrl}/sentio/${config.appId}`;

    // Function to create the iframe for the chatbot
    function createIframe() {
      const iframe = document.createElement("iframe");
      iframe.allow = "fullscreen;microphone";
      iframe.title = "sentio bubble window";
      iframe.id = iframeId;
      iframe.src = iframeUrl;
      iframe.style.cssText = `
        position: absolute;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        left: unset;
        right: 0;
        bottom: 0;
        width: 24rem;
        max-width: calc(100vw - 2rem);
        height: 43.75rem;
        max-height: calc(100vh - 6rem);
        border: none;
        z-index: 2147483640;
        overflow: hidden;
        user-select: none;
      `;

      return iframe;
    }

    // Function to reset the iframe position
    function resetIframePosition() {
      if (window.innerWidth <= 640)
        return

      const targetIframe = document.getElementById(iframeId);
      const targetButton = document.getElementById(buttonId);
      if (targetIframe && targetButton) {
        const buttonRect = targetButton.getBoundingClientRect();

        const buttonInBottom = buttonRect.top - 5 > targetIframe.clientHeight

        if (buttonInBottom) {
          targetIframe.style.bottom = '0px';
          targetIframe.style.top = 'unset';
        }
        else {
          targetIframe.style.bottom = 'unset';
          targetIframe.style.top = '0px';
        }

        const buttonInRight = buttonRect.right > targetIframe.clientWidth;

        if (buttonInRight) {
          targetIframe.style.right = '0';
          targetIframe.style.left = 'unset';
        }
        else {
          targetIframe.style.right = 'unset';
          targetIframe.style.left = 0;
        }
      }
    }

    // Function to create the chat button
    function createButton() {
      const containerDiv = document.createElement("div");
      // Apply custom properties from config
      Object.entries(config.containerProps || {}).forEach(([key, value]) => {
        if (key === "className") {
          containerDiv.classList.add(...value.split(" "));
        } else if (key === "style") {
          if (typeof value === "object") {
            Object.assign(containerDiv.style, value);
          } else {
            containerDiv.style.cssText = value;
          }
        } else if (typeof value === "function") {
          containerDiv.addEventListener(
            key.replace(/^on/, "").toLowerCase(),
            value
          );
        } else {
          containerDiv[key] = value;
        }
      });

      containerDiv.id = buttonId;

      // Add styles for the button
      const styleSheet = document.createElement("style");
      document.head.appendChild(styleSheet);
      styleSheet.sheet.insertRule(`
        #${containerDiv.id} {
          position: fixed;
          bottom: var(--${containerDiv.id}-bottom, 1rem);
          right: var(--${containerDiv.id}-right, 1rem);
          left: var(--${containerDiv.id}-left, unset);
          top: var(--${containerDiv.id}-top, unset);
          width: var(--${containerDiv.id}-width, 48px);
          height: var(--${containerDiv.id}-height, 48px);
          border-radius: var(--${containerDiv.id}-border-radius, 25px);
          background-color: var(--${containerDiv.id}-bg-color, #155EEF);
          box-shadow: var(--${containerDiv.id}-box-shadow, rgba(0, 0, 0, 0.2) 0px 4px 8px 0px);
          cursor: pointer;
          z-index: 2147483647;
        }
      `);

      // Create display div for the button icon
      const displayDiv = document.createElement("div");
      displayDiv.style.cssText =
        "position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; z-index: 2147483647;";
      displayDiv.innerHTML = svgIcons.open;
      containerDiv.appendChild(displayDiv);
      document.body.appendChild(containerDiv);

      // Add click event listener to toggle chatbot
      containerDiv.addEventListener("click", function () {
        const targetIframe = document.getElementById(iframeId);
        if (!targetIframe) {
          containerDiv.prepend(createIframe());
          resetIframePosition();
          this.title = "Exit (ESC)";
          displayDiv.innerHTML = svgIcons.close;
          document.addEventListener('keydown', handleEscKey);
          return;
        }
        targetIframe.style.display = targetIframe.style.display === "none" ? "block" : "none";
        displayDiv.innerHTML = targetIframe.style.display === "none" ? svgIcons.open : svgIcons.close;

        if (targetIframe.style.display === "none") {
          document.removeEventListener('keydown', handleEscKey);
        } else {
          document.addEventListener('keydown', handleEscKey);
        }


        resetIframePosition();
      });

      // Enable dragging if specified in config
      if (config.draggable) {
        enableDragging(containerDiv, config.dragAxis || "both");
      }
    }

    // Function to enable dragging of the chat button
    function enableDragging(element, axis) {
      let isDragging = false;
      let startX, startY;

      element.addEventListener("mousedown", startDragging);
      document.addEventListener("mousemove", drag);
      document.addEventListener("mouseup", stopDragging);

      function startDragging(e) {
        isDragging = true;
        startX = e.clientX - element.offsetLeft;
        startY = e.clientY - element.offsetTop;
      }

      function drag(e) {
        if (!isDragging) return;

        element.style.transition = "none";
        element.style.cursor = "grabbing";

        // Hide iframe while dragging
        const targetIframe = document.getElementById(iframeId);
        if (targetIframe) {
          targetIframe.style.display = "none";
          element.querySelector("div").innerHTML = svgIcons.open;
        }

        const newLeft = e.clientX - startX;
        const newBottom = window.innerHeight - e.clientY - startY;

        const elementRect = element.getBoundingClientRect();
        const maxX = window.innerWidth - elementRect.width;
        const maxY = window.innerHeight - elementRect.height;

        // Update position based on drag axis
        if (axis === "x" || axis === "both") {
          element.style.setProperty(
            `--${buttonId}-left`,
            `${Math.max(0, Math.min(newLeft, maxX))}px`
          );
        }

        if (axis === "y" || axis === "both") {
          element.style.setProperty(
            `--${buttonId}-bottom`,
            `${Math.max(0, Math.min(newBottom, maxY))}px`
          );
        }
      }

      function stopDragging() {
        isDragging = false;
        element.style.transition = "";
        element.style.cursor = "pointer";
      }
    }

    // Create the chat button if it doesn't exist
    if (!document.getElementById(buttonId)) {
      createButton();
    }
  }

  // Add esc Exit keyboard event triggered
  function handleEscKey(event) {
    if (event.key === 'Escape') {
      const targetIframe = document.getElementById(iframeId);
      const button = document.getElementById(buttonId);
      if (targetIframe && targetIframe.style.display !== 'none') {
        targetIframe.style.display = 'none';
        button.querySelector('div').innerHTML = svgIcons.open;
      }
    }
  }
  document.addEventListener('keydown', handleEscKey);

  // Set the embedChatbot function to run when the body is loaded,Avoid infinite nesting
  if (config?.dynamicScript) {
    embedChatbot();
  } else {
    document.body.onload = embedChatbot;
  }
})();