import Admin from './pages/Admin';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessOnboarding from './pages/BusinessOnboarding';
import BusinessProfile from './pages/BusinessProfile';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import Home from './pages/Home';
import Search from './pages/Search';
import WriteReview from './pages/WriteReview';
import Directory from './pages/Directory';
import Events from './pages/Events';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "BusinessDashboard": BusinessDashboard,
    "BusinessOnboarding": BusinessOnboarding,
    "BusinessProfile": BusinessProfile,
    "Categories": Categories,
    "CategoryPage": CategoryPage,
    "Home": Home,
    "Search": Search,
    "WriteReview": WriteReview,
    "Directory": Directory,
    "Events": Events,
}

export const pagesConfig = {
    mainPage: "Search",
    Pages: PAGES,
    Layout: __Layout,
};