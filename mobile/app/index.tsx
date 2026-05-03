import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface0 }}>
        <ActivityIndicator color={theme.coral} size="large" />
      </View>
    );
  }

  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}
