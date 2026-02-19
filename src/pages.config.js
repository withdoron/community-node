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
import Privacy from './pages/Privacy';
import Search from './pages/Search';
import Settings from './pages/Settings';
import SpokeDetails from './pages/SpokeDetails';
import Support from './pages/Support';
import Terms from './pages/Terms';
import Recommend from './pages/Recommend';
import UserOnboarding from './pages/UserOnboarding';
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
    "Privacy": Privacy,
    "Search": Search,
    "Settings": Settings,
    "SpokeDetails": SpokeDetails,
    "Support": Support,
    "Terms": Terms,
    "Recommend": Recommend,
    "welcome": UserOnboarding,
}

export const pagesConfig = {
    mainPage: "Search",
    Pages: PAGES,
    Layout: __Layout,
};