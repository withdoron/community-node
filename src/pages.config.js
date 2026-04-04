import Admin from './pages/Admin';
// BusinessDashboard retired (DEC-131) — workspaces render through MyLane spinner + MyLaneDrillView
import BusinessOnboarding from './pages/BusinessOnboarding';
import BusinessProfile from './pages/BusinessProfile';
import CategoryPage from './pages/CategoryPage';
import Directory from './pages/Directory';
import Events from './pages/Events';
import Home from './pages/Home';
import MyLane from './pages/MyLane';
import Philosophy from './pages/Philosophy';
import Privacy from './pages/Privacy';
import Search from './pages/Search';
import Settings from './pages/Settings';
import SpokeDetails from './pages/SpokeDetails';
import Support from './pages/Support';
import Terms from './pages/Terms';
import Recommend from './pages/Recommend';
import UserOnboarding from './pages/UserOnboarding';
import TeamOnboarding from './pages/TeamOnboarding';
import FinanceOnboarding from './pages/FinanceOnboarding';
import FieldServiceOnboarding from './pages/FieldServiceOnboarding';
import PropertyManagementOnboarding from './pages/PropertyManagementOnboarding';
import MealPrepOnboarding from './pages/MealPrepOnboarding';
// JoinTeam and JoinPM imported only in App.jsx for parameterized routes
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    // "BusinessDashboard" retired (DEC-131) — redirects to MyLane
    "BusinessOnboarding": BusinessOnboarding,
    "BusinessProfile": BusinessProfile,
    "CategoryPage": CategoryPage,
    "Directory": Directory,
    "Events": Events,
    "Home": Home,
    "MyLane": MyLane,
    "Philosophy": Philosophy,
    "Privacy": Privacy,
    "Search": Search,
    "Settings": Settings,
    "SpokeDetails": SpokeDetails,
    "Support": Support,
    "Terms": Terms,
    "Recommend": Recommend,
    "welcome": UserOnboarding,
    "TeamOnboarding": TeamOnboarding,
    "FinanceOnboarding": FinanceOnboarding,
    "FieldServiceOnboarding": FieldServiceOnboarding,
    "PropertyManagementOnboarding": PropertyManagementOnboarding,
    "MealPrepOnboarding": MealPrepOnboarding,
    // JoinTeam and JoinPM removed from pages config — they require URL params
    // (inviteCode / slug) and show infinite spinners without them.
    // Access via /join/:inviteCode, /door/:slug, /join-pm/:inviteCode only.
}

export const pagesConfig = {
    mainPage: "MyLane",
    Pages: PAGES,
    Layout: __Layout,
};