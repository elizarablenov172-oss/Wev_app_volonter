import { Storefront } from "@phosphor-icons/react/dist/ssr";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function MarketplacePage() {
  return (
    <PagePlaceholder
      icon={Storefront}
      title="Маркетплейс наград"
      description="Обмен токенов на награды от партнёров: каталог, покупка и история — на этапе «Marketplace»."
    />
  );
}
