import {
  Container,
  Stack,
  ThemeIcon,
  Title,
  Text,
  Center,
} from "@mantine/core";
import { IconDog } from "@tabler/icons";

const AccessDenied = ({ message }: { message: string }) => (
  <Container size="xl" py="xl" h="80vh">
    <Center style={{ height: "100%" }}>
      <Stack align="center" spacing="md">
        <ThemeIcon
          size={120}
          radius={100}
          color="orange"
          variant="light"
          sx={{ border: "4px solid var(--mantine-color-orange-2)" }}
        >
          <IconDog size={80} />
        </ThemeIcon>
        <Title order={2} align="center">
          Oops! Dog ate the resource that you&apos;re looking for.
        </Title>
        <Text color="dimmed" size="lg" align="center" mt="xs">
          {message}
        </Text>
      </Stack>
    </Center>
  </Container>
);

export default AccessDenied;
