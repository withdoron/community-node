/**
 * UserOnboarding.jsx — Legacy redirect.
 * The onboarding wizard has been replaced by conversational onboarding
 * via InlineWelcome in MyLane.jsx. This file exists only to catch
 * stale links or bookmarks to /welcome.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function UserOnboarding() {
  return <Navigate to={createPageUrl('MyLane')} replace />;
}
