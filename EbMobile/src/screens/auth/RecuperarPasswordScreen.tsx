import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ArrowLeft, Mail } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/context/ThemeContext";
import type { AuthStackScreenProps } from "@/navigation/types";

export function RecuperarPasswordScreen({
  navigation,
}: AuthStackScreenProps<"RecuperarPassword">) {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <ScreenContainer keyboardAvoiding contentClassName="gap-6">
      <Pressable
        onPress={() => navigation.goBack()}
        className="flex-row items-center gap-1.5"
      >
        <ArrowLeft size={16} color={colors.textMuted} />
        <Text className="text-sm font-medium text-app-text-muted dark:text-app-dark-text-muted">
          Volver
        </Text>
      </Pressable>

      <View>
        <Text className="text-3xl font-bold text-app-text dark:text-app-dark-text">
          Recuperar contraseña
        </Text>
        <Text className="mt-1 text-sm text-app-text-muted dark:text-app-dark-text-muted">
          Ingresa el correo asociado a tu cuenta.
        </Text>
      </View>

      {submitted ? (
        <Card>
          <Text className="text-sm leading-6 text-app-text dark:text-app-dark-text">
            Si <Text className="font-semibold">{email}</Text> está asociado a
            una cuenta, recibirás un correo con instrucciones en los próximos
            minutos.
          </Text>
        </Card>
      ) : (
        <View className="gap-4">
          <Input
            label="Correo electrónico"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="tu@correo.com"
            value={email}
            onChangeText={setEmail}
            leftIcon={<Mail size={16} color={colors.textMuted} />}
          />
          <Button
            fullWidth
            size="lg"
            onPress={() => setSubmitted(true)}
            disabled={!email}
          >
            Enviar enlace
          </Button>
        </View>
      )}
    </ScreenContainer>
  );
}
