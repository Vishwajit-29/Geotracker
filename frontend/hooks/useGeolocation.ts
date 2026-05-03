
import { useState, useCallback } from 'react';
import { Location } from '../types';

interface GeolocationState {
  location: Location | null;
  error: string | null;
  isLoading: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isLoading: false,
  });

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ location: null, error: 'Geolocation is not supported by your browser.', isLoading: false });
      return;
    }

    setState((prevState) => ({ ...prevState, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          error: null,
          isLoading: false,
        });
      },
      (err) => {
        let errorMessage = 'An unknown error occurred.';
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "User denied the request for Geolocation.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case err.TIMEOUT:
            errorMessage = "The request to get user location timed out.";
            break;
        }
        setState({ location: null, error: errorMessage, isLoading: false });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return { ...state, getLocation };
};
