import { createDrawerNavigator } from "@react-navigation/drawer";
import { Pressable } from "react-native";
import { Menu } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { can } from "@/lib/permissions";
import { CustomDrawerContent } from "./CustomDrawerContent";
import { DashboardScreen } from "@/screens/admin/DashboardScreen";
import { EquiposScreen } from "@/screens/admin/EquiposScreen";
import { MantenimientosScreen } from "@/screens/admin/MantenimientosScreen";
import { AgendamientosScreen } from "@/screens/admin/AgendamientosScreen";
import { FallasScreen } from "@/screens/admin/FallasScreen";
import { SedesScreen } from "@/screens/admin/SedesScreen";
import { UsuariosScreen } from "@/screens/admin/UsuariosScreen";
import { PerfilScreen } from "@/screens/admin/PerfilScreen";
import type { AppDrawerParamList } from "./types";

const Drawer = createDrawerNavigator<AppDrawerParamList>();

export function AppDrawer() {
  const { colors, theme } = useTheme();
  const { usuario } = useAuth();
  const role = usuario?.role;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.toggleDrawer()}
            hitSlop={8}
            className="ml-3"
          >
            <Menu size={22} color={colors.text} />
          </Pressable>
        ),
        drawerStyle: { backgroundColor: theme === "dark" ? "#131a26" : "#ffffff" },
      })}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Dashboard" }}
      />
      {can(role as any, "equipment", "view") && (
        <Drawer.Screen
          name="Equipos"
          component={EquiposScreen}
          options={{ title: "Equipos" }}
        />
      )}
      {can(role as any, "maintenance", "view") && (
        <Drawer.Screen
          name="Mantenimientos"
          component={MantenimientosScreen}
          options={{ title: "Mantenimientos" }}
        />
      )}
      {can(role as any, "scheduling", "view") && (
        <Drawer.Screen
          name="Agendamientos"
          component={AgendamientosScreen}
          options={{ title: "Agendamientos" }}
        />
      )}
      {can(role as any, "failures", "view") && (
        <Drawer.Screen
          name="Fallas"
          component={FallasScreen}
          options={{ title: "Fallas" }}
        />
      )}
      {can(role as any, "branches", "view") && (
        <Drawer.Screen
          name="Sedes"
          component={SedesScreen}
          options={{ title: "Sedes" }}
        />
      )}
      {can(role as any, "users", "view") && (
        <Drawer.Screen
          name="Usuarios"
          component={UsuariosScreen}
          options={{ title: "Usuarios" }}
        />
      )}
      <Drawer.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ title: "Mi perfil" }}
      />
    </Drawer.Navigator>
  );
}
