import Admin from './pages/Admin';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessOnboarding from './pages/BusinessOnboarding';
import BusinessProfile from './pages/BusinessProfile';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import Search from './pages/Search';
import WriteReview from './pages/WriteReview';
import homeV2 from './pages/Home.v2';
import HomeV2 from './pages/HomeV2';
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
    "Home.v2": homeV2,
    "HomeV2": HomeV2,
}

export const pagesConfig = {
    mainPage: "Search",
    Pages: PAGES,
    Layout: __Layout,
};