import Admin from './pages/Admin';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessOnboarding from './pages/BusinessOnboarding';
import BusinessProfile from './pages/BusinessProfile';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import Directory from './pages/Directory';
import Events from './pages/Events';
import Home from './pages/Home';
import Search from './pages/Search';
import WriteReview from './pages/WriteReview';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "BusinessDashboard": BusinessDashboard,
    "BusinessOnboarding": BusinessOnboarding,
    "BusinessProfile": BusinessProfile,
    "Categories": Categories,
    "CategoryPage": CategoryPage,
    "Directory": Directory,
    "Events": Events,
    "Home": Home,
    "Search": Search,
    "WriteReview": WriteReview,
}

export const pagesConfig = {
    mainPage: "Search",
    Pages: PAGES,
    Layout: __Layout,
};