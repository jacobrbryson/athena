import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { Home } from './pages/home/home';
import { Kids } from './pages/kids/kids';
import { Login } from './pages/login/login';
import { Parents } from './pages/parents/parents';
import { Profile } from './pages/profile/profile';
import { ProfileOptions } from './pages/profile-options/profile-options';
import { LearningGoals } from './pages/learning-goals/learning-goals';
import { Activity } from './pages/activity/activity';
import { About } from './pages/about/about';
import { Store } from './pages/store/store';
import { SeeHowAthenaLearns } from './pages/see-how-athena-learns/see-how-athena-learns';
import { Teachers } from './pages/teachers/teachers';
import { Dashboard } from './pages/dashboard/dashboard';
import { ProfileGuard } from './profile.guard';
import { TermsOfService } from './pages/terms-of-service/terms-of-service';
import { PrivacyPolicy } from './pages/privacy-policy/privacy-policy';

export const routes: Routes = [
  {
    path: 'profile/:uuid/options',
    component: ProfileOptions,
    title: 'Athena | Child Options',
    canActivate: [AuthGuard],
  },
  {
    path: '',
    component: Home,
    title: 'Athena | AI Companion',
  },
  {
    path: 'kids',
    component: Kids,
    title: 'Athena | For Kids',
  },
  {
    path: 'parents',
    component: Parents,
    title: 'Athena | For Parents',
  },
  {
    path: 'teachers',
    component: Teachers,
    title: 'Athena | For Teachers',
  },
  {
    path: 'see-how-athena-learns',
    component: SeeHowAthenaLearns,
    title: 'Athena | See How Athena Learns',
  },
  {
    path: 'dashboard',
    component: Dashboard,
    title: 'Athena | Dashboard',
    canActivate: [AuthGuard, ProfileGuard],
  },
  {
    path: 'dashboard/store',
    component: Store,
    title: 'Athena | Store',
    canActivate: [AuthGuard, ProfileGuard],
  },
  {
    path: 'dashboard/profile/:uuid/learning-goals',
    component: LearningGoals,
    title: 'Athena | Learning Goals',
    canActivate: [AuthGuard, ProfileGuard],
  },
  {
    path: 'dashboard/profile/:uuid/activity',
    component: Activity,
    title: 'Athena | Activity',
    canActivate: [AuthGuard, ProfileGuard],
  },
  {
    path: 'profile',
    component: Profile,
    title: 'Athena | Profile',
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'about',
    component: About,
    title: 'Athena | About',
  },
  {
    path: 'profile/:uuid/options',
    component: ProfileOptions,
    title: 'Athena | Child Options',
    canActivate: [AuthGuard],
  },
  {
    path: 'login',
    component: Login,
    title: 'Athena | Login',
  },
  {
    path: 'terms-of-service',
    component: TermsOfService,
    title: 'Athena | Terms of Service',
  },
  {
    path: 'privacy-policy',
    component: PrivacyPolicy,
    title: 'Athena | Privacy Policy',
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
