import { ToastProvider } from './components/ui';
import AppRouter from './routes/AppRouter';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';

const App = () => (
    <AppProvider>
        <AppRouter />
    </AppProvider>
);

const AppContainer = () => (
    <ThemeProvider>
        <ToastProvider>
            <App />
        </ToastProvider>
    </ThemeProvider>
);

export default AppContainer;

