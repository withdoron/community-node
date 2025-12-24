import Admin from './pages/Admin';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessOnboarding from './pages/BusinessOnboarding';
import BusinessProfile from './pages/BusinessProfile';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import Directory from './pages/Directory';
import Events from './pages/Events';
import Home from './pages/Home';
import MyLane from './pages/MyLane';
import Search from './pages/Search';
import WriteReview from './pages/WriteReview';
import BuildLane from './pages/BuildLane';
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
    "MyLane": MyLane,
    "Search": Search,
    "WriteReview": WriteReview,
    "BuildLane": BuildLane,
}

export const pagesConfig = {
    mainPage: "Search",
    Pages: PAGES,
    Layout: __Layout,
};