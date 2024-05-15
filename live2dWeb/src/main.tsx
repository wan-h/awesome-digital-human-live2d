import React from 'react';
import { createRoot } from 'react-dom/client';
import { AlertComponent } from './app/components/alertComponent';
import { Live2dComponent } from './app/components/live2dComponent';
import { FloatButtonsComponent } from './app/components/floatButtonsComponent';

import store from './app/store';
import { Provider } from 'react-redux';

function App() {
  return (
    <Provider store={store}>
      <AlertComponent />
      <Live2dComponent />
      <FloatButtonsComponent />
    </Provider>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);