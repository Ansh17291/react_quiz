// import React from 'react';
import { ToastProvider } from './components/ui';
import AppRouter from './routes/AppRouter';
import { AppProvider } from './context/AppContext';

const App = () => (
    <AppProvider>
        <AppRouter />
    </AppProvider>
);

const AppContainer = () => (
    <ToastProvider>
        <App />
    </ToastProvider>
);

export default AppContainer;
