import { useEffect, useState, useCallback } from "react";
import { RefreshControl, Text, View } from "react-native";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Wrench,
} from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ROLE_LABEL } from "@/lib/permissions";
import { equipmentService } from "@/services/equipment.service";
import { failuresService } from "@/services/failures.service";
import { schedulingService } from "@/services/scheduling.service";
import type { Equipment } from "@/types/equipment";

export function DashboardScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    equipos: 0,
    operativos: 0,
    pendientes: 0,
    alertas: 0,
  });
  const [recientes, setRecientes] = useState<Equipment[]>([]);

  const load = useCallback(async () => {
    try {
      const [equipos, fallasAbiertas, agendaPendiente] = await Promise.all([
        equipmentService.list({ ordering: "-created_at" }),
        failuresService.list({ resolved: false }),
        schedulingService.list({ is_completed: false }),
      ]);
      const operativos = equipos.filter((e) => e.status === "ACTIVE").length;
      setStats({
        equipos: equipos.length,
        operativos,
        pendientes: agendaPendiente.length,
        alertas: fallasAbiertas.length,
      });
      setRecientes(equipos.slice(0, 5));
    } catch {
      // Silencioso: el dashboard nunca debe romper si una métrica falla.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const fullName = usuario
    ? [usuario.first_name, usuario.last_name].filter(Boolean).join(" ") ||
      usuario.username
    : "";

  const cards = [
    {
      label: "Equipos registrados",
      value: stats.equipos,
      icon: <ClipboardList size={20} color="#2563eb" />,
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "Operativos",
      value: stats.operativos,
      icon: <CheckCircle2 size={20} color="#059669" />,
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      label: "Pendientes",
      value: stats.pendientes,
      icon: <Wrench size={20} color="#d97706" />,
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      label: "En alerta",
      value: stats.alertas,
      icon: <AlertTriangle size={20} color="#dc2626" />,
      bg: "bg-red-50 dark:bg-red-950/40",
    },
  ];

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View>
        <Text className="text-2xl font-bold text-app-text dark:text-app-dark-text">
          Hola, {fullName} 👋
        </Text>
        {usuario && (
          <Text className="mt-1 text-sm text-app-text-muted dark:text-app-dark-text-muted">
            Tu perfil:{" "}
            <Text className="font-medium text-app-text dark:text-app-dark-text">
              {ROLE_LABEL[usuario.role]}
            </Text>
            . Resumen general del estado de los equipos biomédicos.
          </Text>
        )}
      </View>

      <View className="flex-row flex-wrap gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="min-w-[47%] flex-1">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                  {c.label}
                </Text>
                <Text className="mt-1 text-2xl font-bold text-app-text dark:text-app-dark-text">
                  {c.value}
                </Text>
              </View>
              <View className={`rounded-lg p-2 ${c.bg}`}>{c.icon}</View>
            </View>
          </Card>
        ))}
      </View>

      <Card>
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-base font-semibold text-app-text dark:text-app-dark-text">
              Equipos recientes
            </Text>
            <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
              Últimos creados
            </Text>
          </View>
          <Activity size={16} color={colors.textMuted} />
        </View>
        {recientes.length === 0 ? (
          <Text className="text-sm text-app-text-muted dark:text-app-dark-text-muted">
            Aún no hay equipos registrados.
          </Text>
        ) : (
          <View className="gap-3">
            {recientes.map((eq, idx) => (
              <View
                key={eq.id}
                className={
                  idx === recientes.length - 1
                    ? "flex-row items-center justify-between"
                    : "flex-row items-center justify-between border-b border-app-border dark:border-app-dark-border pb-2"
                }
              >
                <View className="flex-1 pr-2">
                  <Text
                    className="text-sm font-medium text-app-text dark:text-app-dark-text"
                    numberOfLines={1}
                  >
                    {eq.name}
                  </Text>
                  <Text
                    className="text-xs text-app-text-muted dark:text-app-dark-text-muted"
                    numberOfLines={1}
                  >
                    {eq.asset_tag} · {eq.branch_name ?? "Sin sede"}
                  </Text>
                </View>
                <Badge
                  tone={
                    eq.status === "ACTIVE"
                      ? "success"
                      : eq.status === "IN_MAINTENANCE"
                        ? "warning"
                        : eq.status === "IN_REPAIR"
                          ? "danger"
                          : "neutral"
                  }
                >
                  {labelStatus(eq.status)}
                </Badge>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScreenContainer>
  );
}

function labelStatus(s: Equipment["status"]) {
  switch (s) {
    case "ACTIVE":
      return "Operativo";
    case "INACTIVE":
      return "Inactivo";
    case "IN_MAINTENANCE":
      return "Mantenimiento";
    case "IN_REPAIR":
      return "Reparación";
  }
}
