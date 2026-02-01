import Admin from './pages/Admin';
import BuildLane from './pages/BuildLane';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessOnboarding from './pages/BusinessOnboarding';
import BusinessProfile from './pages/BusinessProfile';
import CategoryPage from './pages/CategoryPage';
import Directory from './pages/Directory';
import Events from './pages/Events';
import Home from './pages/Home';
import MyLane from './pages/MyLane';
import PunchPass from './pages/PunchPass';
import Search from './pages/Search';
import SpokeDetails from './pages/SpokeDetails';
import Recommend from './pages/Recommend';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "BuildLane": BuildLane,
    "BusinessDashboard": BusinessDashboard,
    "BusinessOnboarding": BusinessOnboarding,
    "BusinessProfile": BusinessProfile,
    "CategoryPage": CategoryPage,
    "Directory": Directory,
    "Events": Events,
    "Home": Home,
    "MyLane": MyLane,
    "PunchPass": PunchPass,
    "Search": Search,
    "SpokeDetails": SpokeDetails,
    "Recommend": Recommend,
}

export const pagesConfig = {
    mainPage: "Search",
    Pages: PAGES,
    Layout: __Layout,
};