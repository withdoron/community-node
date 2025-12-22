import Admin from './pages/Admin';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessOnboarding from './pages/BusinessOnboarding';
import BusinessProfile from './pages/BusinessProfile';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import Search from './pages/Search';
import WriteReview from './pages/WriteReview';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "BusinessDashboard": BusinessDashboard,
    "BusinessOnboarding": BusinessOnboarding,
    "BusinessProfile": BusinessProfile,
    "Categories": Categories,
    "CategoryPage": CategoryPage,
    "Search": Search,
    "WriteReview": WriteReview,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Search",
    Pages: PAGES,
    Layout: __Layout,
};