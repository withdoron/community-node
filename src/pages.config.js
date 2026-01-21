import Admin from './pages/Admin';
import BuildLane from './pages/BuildLane';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessOnboarding from './pages/BusinessOnboarding';
import BusinessProfile from './pages/BusinessProfile';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import Directory from './pages/Directory';
import Events from './pages/Events';
import Home from './pages/Home';
import MigrateCategories from './pages/MigrateCategories';
import MyLane from './pages/MyLane';
import PunchPass from './pages/PunchPass';
import Search from './pages/Search';
import SpokeDetails from './pages/SpokeDetails';
import WriteReview from './pages/WriteReview';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "BuildLane": BuildLane,
    "BusinessDashboard": BusinessDashboard,
    "BusinessOnboarding": BusinessOnboarding,
    "BusinessProfile": BusinessProfile,
    "Categories": Categories,
    "CategoryPage": CategoryPage,
    "Directory": Directory,
    "Events": Events,
    "Home": Home,
    "MigrateCategories": MigrateCategories,
    "MyLane": MyLane,
    "PunchPass": PunchPass,
    "Search": Search,
    "SpokeDetails": SpokeDetails,
    "WriteReview": WriteReview,
}

export const pagesConfig = {
    mainPage: "Search",
    Pages: PAGES,
    Layout: __Layout,
};