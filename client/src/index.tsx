import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { base_path } from "./environment.jsx";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "../src/index.scss";
import store from "./core/data/redux/store.jsx";
import { Provider } from "react-redux";
import ALLRoutes from "./feature-module/router/router.jsx";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToasterCenter } from './components/toaster/ToasterCenter.jsx';

// Create a QueryClient instance
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={base_path}>
          <ALLRoutes />
        </BrowserRouter>
        <ToasterCenter />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
