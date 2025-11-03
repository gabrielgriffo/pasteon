import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  // Tenta usar next-themes, mas fallback para 'system' se não disponível
  let theme: ToasterProps["theme"] = "system"

  try {
    const themeHook = useTheme()
    theme = (themeHook?.theme as ToasterProps["theme"]) || "system"
  } catch {
    // Se useTheme falhar, usa 'system' como fallback
    theme = "system"
  }

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toast]:bg-green-50 group-[.toast]:text-green-900 dark:group-[.toast]:bg-green-950 dark:group-[.toast]:text-green-100",
          error: "group-[.toast]:bg-red-50 group-[.toast]:text-red-900 dark:group-[.toast]:bg-red-950 dark:group-[.toast]:text-red-100",
          warning: "group-[.toast]:bg-yellow-50 group-[.toast]:text-yellow-900 dark:group-[.toast]:bg-yellow-950 dark:group-[.toast]:text-yellow-100",
          info: "group-[.toast]:bg-blue-50 group-[.toast]:text-blue-900 dark:group-[.toast]:bg-blue-950 dark:group-[.toast]:text-blue-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
