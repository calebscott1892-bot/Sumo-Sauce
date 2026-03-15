import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { trackNavigation } from '@/utils/analytics';

const scrollPositions = new Map();

function buildLocationKey(location) {
  return location.key || `${location.pathname}${location.search}${location.hash}`;
}

function restoreHashTarget(hash) {
  if (!hash) return false;
  const rawId = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!rawId) return false;

  const decodedId = decodeURIComponent(rawId);
  const target = document.getElementById(decodedId);
  if (!target) return false;

  target.scrollIntoView({ block: 'start' });
  return true;
}

export default function RouteScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPathnameRef = useRef(location.pathname);
  const previousRouteRef = useRef(`${location.pathname}${location.search}${location.hash}`);

  useEffect(() => {
    const nextRoute = `${location.pathname}${location.search}${location.hash}`;
    if (previousRouteRef.current !== nextRoute) {
      trackNavigation(previousRouteRef.current, nextRoute);
      previousRouteRef.current = nextRoute;
    }
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    const locationKey = buildLocationKey(location);
    const restoreY = scrollPositions.get(locationKey);
    const pathnameChanged = previousPathnameRef.current !== location.pathname;

    const frame = window.requestAnimationFrame(() => {
      if (restoreHashTarget(location.hash)) return;

      if (navigationType === 'POP' && typeof restoreY === 'number') {
        window.scrollTo({ top: restoreY, left: 0, behavior: 'auto' });
        return;
      }

      if (pathnameChanged) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
      previousPathnameRef.current = location.pathname;
      scrollPositions.set(locationKey, window.scrollY);
    };
  }, [location, navigationType]);

  return null;
}
