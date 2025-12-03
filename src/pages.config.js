import Search from './pages/Search';
import BusinessProfile from './pages/BusinessProfile';
import WriteReview from './pages/WriteReview';
import BusinessOnboarding from './pages/BusinessOnboarding';
import BusinessDashboard from './pages/BusinessDashboard';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Search": Search,
    "BusinessProfile": BusinessProfile,
    "WriteReview": WriteReview,
    "BusinessOnboarding": BusinessOnboarding,
    "BusinessDashboard": BusinessDashboard,
    "Categories": Categories,
    "CategoryPage": CategoryPage,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Search",
    Pages: PAGES,
    Layout: __Layout,
};