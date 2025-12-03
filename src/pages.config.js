import Home from './pages/Home';
import Search from './pages/Search';
import BusinessProfile from './pages/BusinessProfile';
import WriteReview from './pages/WriteReview';
import BusinessOnboarding from './pages/BusinessOnboarding';
import BusinessDashboard from './pages/BusinessDashboard';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Search": Search,
    "BusinessProfile": BusinessProfile,
    "WriteReview": WriteReview,
    "BusinessOnboarding": BusinessOnboarding,
    "BusinessDashboard": BusinessDashboard,
    "Categories": Categories,
    "CategoryPage": CategoryPage,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};