import { useEffect } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { setSessionToken, setUserInfo } from "@/lib/_core/auth";
import { GOOGLE_ERROR_MESSAGES, claimGoogleTicket } from "@/lib/google-login";

/**
 * Destino do link conectabarra://google-auth?ticket=… (ou ?error=…) que o servidor abre ao terminar o login no Google.
 * Ter uma rota real aqui também evita o "Unmatched Route" do Expo Router.
 */
export default function GoogleAuthScreen() {
  const params = useLocalSearchParams<{ ticket?: string; error?: string }>();
  const exchange = trpc.auth.exchangeGoogleTicket.useMutation();
  const ticket = typeof params.ticket === "string" ? params.ticket : "";
  const error = typeof params.error === "string" ? params.error : "";

  useEffect(() => {
    if (error) {
      Alert.alert("Não foi possível entrar com Google", GOOGLE_ERROR_MESSAGES[error] ?? "Tente novamente em instantes.");
      router.replace("/login");
      return;
    }
    if (!ticket) {
      router.replace("/login");
      return;
    }
    if (!claimGoogleTicket(ticket)) return; // outro caminho já está tratando este tíquete
    void (async () => {
      try {
        const result = await exchange.mutateAsync({ ticket });
        await setSessionToken(result.token);
        await setUserInfo(result.user);
        if (result.user.role === "admin") router.replace("/admin");
        else if (result.profileComplete) router.replace("/(tabs)");
        else {
          // Conta Google nova: o morador precisa completar endereço e telefone antes de usar os serviços.
          router.replace("/(tabs)/profile");
          setTimeout(() => Alert.alert("Complete seu cadastro", "Informe telefone e endereço (CEP, rua, número e bairro) em Conta → Editar para liberar os serviços."), 600);
        }
      } catch (err) {
        Alert.alert("Não foi possível entrar com Google", err instanceof Error ? err.message : "Tente novamente.");
        router.replace("/login");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket, error]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0B5FD8" />
      <Text style={styles.text}>Concluindo o login…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: "#FFFFFF" },
  text: { fontSize: 15, fontWeight: "700", color: "#0B5FD8" },
});
