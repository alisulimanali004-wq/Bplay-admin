import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PageContainer,
  PageHeader,
  DetailHero,
  MetaItem,
  Badge,
  Avatar,
  Spinner,
  ErrorState,
  EmptyState,
  ImageLightbox,
  Tabs,
  InboxIcon,
  PhoneIcon,
  DocumentIcon,
  CalendarIcon,
  EditIcon,
  Button,
  toLocalPhone,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { useOwnerQuery } from '../hooks/useOwnerQuery';
import { useOwnerFacilities } from '../hooks/useOwnerFacilities';
import { OwnerStatusActions } from '../components/OwnerStatusActions';
import { OwnerAttentionCard } from '../components/OwnerAttentionCard';
import { OwnerFacilityStats } from '../components/OwnerFacilityStats';
import { OwnerFacilitiesCard } from '../components/OwnerFacilitiesCard';
import { OwnerDocumentsCard } from '../components/OwnerDocumentsCard';
import { OwnerAboutCard } from '../components/OwnerAboutCard';
import { OwnerEditModal } from '../components/OwnerEditModal';
import { OwnerSubscriptionCard } from '../components/OwnerSubscriptionCard';
import { OwnerPostsCard } from '../components/OwnerPostsCard';
import {
  ownerState,
  ownerStateBadgeVariant,
  type Owner,
} from '../api/owner.types';
import styles from './OwnerProfilePage.module.css';

const NOT_FOUND_MESSAGE = 'Owner not found';
const TAB_KEYS = ['overview', 'posts'] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default function OwnerProfilePage() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const { t } = useTranslation();
  const { data: owner, isLoading, isError, error, refetch } = useOwnerQuery(ownerId);
  const edit = useDisclosure();

  const notFound =
    (isError && error instanceof Error && error.message === NOT_FOUND_MESSAGE) ||
    (!isLoading && !isError && !owner);

  return (
    <PageContainer>
      <PageHeader
        title={owner ? owner.name : t('owner.profile.title')}
        subtitle={t('owner.profile.subtitle')}
        showBack
        backLabel={t('common.back')}
        actions={
          owner ? (
            <>
              <Button
                variant="secondary"
                leftIcon={<EditIcon />}
                onClick={edit.open}
                data-testid="owner-edit"
              >
                {t('owner.edit.action')}
              </Button>
              <OwnerStatusActions owner={owner} />
            </>
          ) : undefined
        }
      />

      {owner && <OwnerEditModal isOpen={edit.isOpen} onClose={edit.close} owner={owner} />}

      {isLoading ? (
        <div className={styles.center}>
          <Spinner size="lg" />
        </div>
      ) : notFound ? (
        <EmptyState icon={<InboxIcon />} title={t('owner.profile.notFound')} />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : owner ? (
        <OwnerProfileContent owner={owner} />
      ) : null}
    </PageContainer>
  );
}

function OwnerProfileContent({ owner }: { owner: Owner }) {
  const { t, i18n } = useTranslation();
  const lightbox = useDisclosure();
  const { data: facilities, isLoading: facilitiesLoading } = useOwnerFacilities(owner.id);
  const facilityList = useMemo(() => facilities ?? [], [facilities]);

  const state = ownerState(owner);
  const dateLocale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const createdLabel = owner.createdAt
    ? new Date(owner.createdAt).toLocaleDateString(dateLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;
  const phoneLabel = owner.phone ? `+963 ${toLocalPhone(owner.phone)}` : '—';
  const [tab, setTab] = useState<TabKey>('overview');
  const tabs = TAB_KEYS.map((key) => ({ key, label: t(`owner.tabs.${key}`) }));

  return (
    <div className={styles.page}>
      <DetailHero
        name={owner.name}
        email={owner.email}
        photoUrl={owner.photoUrl}
        onPhotoClick={lightbox.open}
        photoLabel={t('owner.profile.viewPhoto')}
        testId="owner-detail-hero"
        badges={
          <Badge variant={ownerStateBadgeVariant(state)}>{t(`owner.state.${state}`)}</Badge>
        }
        meta={
          <>
            <MetaItem icon={<PhoneIcon />} label={t('owner.col.phone')} value={phoneLabel} ltr />
            {owner.nationalId && (
              <MetaItem
                icon={<DocumentIcon />}
                label={t('owner.col.nationalId')}
                value={owner.nationalId}
                ltr
              />
            )}
            {createdLabel && (
              <MetaItem icon={<CalendarIcon />} label={t('owner.col.created')} value={createdLabel} />
            )}
          </>
        }
      />

      <OwnerAttentionCard owner={owner} />

      <OwnerFacilityStats facilities={facilityList} />

      <Tabs
        items={tabs}
        value={tab}
        onChange={(key) => setTab(key as TabKey)}
        aria-label={t('owner.tabs.aria')}
      />

      <div className={styles.tabPanel}>
        {tab === 'overview' && (
          <div className={styles.panel}>
            <OwnerSubscriptionCard ownerId={owner.id} />
            <div className={styles.grid}>
              <OwnerAboutCard owner={owner} />
              <OwnerDocumentsCard ownerId={owner.id} documents={owner.documents} />
            </div>
            <OwnerFacilitiesCard facilities={facilityList} isLoading={facilitiesLoading} />
          </div>
        )}
        {tab === 'posts' && <OwnerPostsCard ownerId={owner.id} />}
      </div>

      <ImageLightbox
        isOpen={lightbox.isOpen}
        onClose={lightbox.close}
        src={owner.photoUrl}
        alt={owner.name}
        title={owner.name}
        closeLabel={t('common.close')}
        zoomInLabel={t('common.zoomIn')}
        zoomOutLabel={t('common.zoomOut')}
        resetLabel={t('common.resetZoom')}
        fallback={<Avatar name={owner.name} size="xl" />}
      />
    </div>
  );
}
