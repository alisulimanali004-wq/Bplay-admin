import { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  PageContainer,
  PageHeader,
  Stepper,
  Spinner,
  EmptyState,
  ErrorState,
  MapPinIcon,
  StadiumIcon,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { useCreateFacility } from '../hooks/useCreateFacility';
import { useUpdateFacility } from '../hooks/useUpdateFacility';
import { useFacilityQuery } from '../hooks/useFacilityQuery';
import {
  canEditFacility,
  facilityToInput,
  type CreateFacilityInput,
  type Facility,
  type FacilityRegionSeed,
} from '../api/facility.types';
import { Step1OwnerType } from '../components/wizard/Step1OwnerType';
import { Step2Basics } from '../components/wizard/Step2Basics';
import { Step3Location } from '../components/wizard/Step3Location';
import { Step4Details } from '../components/wizard/Step4Details';
import { StepCourts } from '../components/wizard/StepCourts';
import { Step5Media } from '../components/wizard/Step5Media';
import styles from './AddFacilityWizardPage.module.css';

/** Draft fields that stop making sense when the facility kind flips (club ⇄ pitch). */
const KIND_SPECIFIC_FIELDS = [
  'description',
  'workingHours',
  'courts',
  'pricePerHour',
  'capacity',
  'specs',
  'cancelPolicy',
] as const;

type StepKey = 'owner' | 'basics' | 'location' | 'details' | 'courts' | 'media';

/**
 * Add / Edit Facility wizard. The page owns the draft (`Partial<CreateFacilityInput>`)
 * and the active index; every step is its own small RHF form seeded from the draft,
 * so Back keeps whatever was typed and Next only merges validated values.
 *
 * - New: opened at /new. From a region's detail page (router state carries a seed)
 *   the location step is pre-centred on the region + draws its radius circle.
 * - Edit: opened at /:id/edit — the facility is loaded and the draft pre-filled.
 */
export default function AddFacilityWizardPage() {
  const { facilityId } = useParams<{ facilityId: string }>();
  const { t } = useTranslation();
  const editMode = Boolean(facilityId);
  const facilityQuery = useFacilityQuery(facilityId);

  const routerLocation = useLocation();
  const regionSeed =
    (routerLocation.state as { region?: FacilityRegionSeed } | null)?.region ?? null;

  if (editMode) {
    if (facilityQuery.isLoading) {
      return (
        <PageContainer>
          <PageHeader
            title={t('facility.wizard.editTitle')}
            subtitle={t('facility.wizard.editSubtitle')}
            showBack
            backLabel={t('common.back')}
          />
          <div className={styles.loading}>
            <Spinner size="lg" />
          </div>
        </PageContainer>
      );
    }
    if (facilityQuery.isError) {
      return (
        <PageContainer>
          <PageHeader
            title={t('facility.wizard.editTitle')}
            showBack
            backLabel={t('common.back')}
          />
          <ErrorState
            message={t('common.loadError')}
            retryLabel={t('common.retry')}
            onRetry={() => void facilityQuery.refetch()}
          />
        </PageContainer>
      );
    }
    if (!facilityQuery.data) {
      return (
        <PageContainer>
          <PageHeader title={t('facility.wizard.editTitle')} showBack backLabel={t('common.back')} />
          <EmptyState icon={<StadiumIcon />} title={t('facility.profile.notFound')} />
        </PageContainer>
      );
    }
    if (!canEditFacility(facilityQuery.data.source)) {
      return <Navigate to={`${PATHS.facilityManagement}/${facilityId}`} replace />;
    }
    return (
      <FacilityWizard
        editId={facilityId}
        initialDraft={facilityToInput(facilityQuery.data)}
        regionSeed={null}
      />
    );
  }

  const initialDraft: Partial<CreateFacilityInput> = regionSeed
    ? { location: { lat: regionSeed.centerLat, lng: regionSeed.centerLng, address: '' } }
    : {};
  return <FacilityWizard initialDraft={initialDraft} regionSeed={regionSeed} />;
}

interface FacilityWizardProps {
  initialDraft: Partial<CreateFacilityInput>;
  editId?: string;
  regionSeed?: FacilityRegionSeed | null;
}

function FacilityWizard({ initialDraft, editId, regionSeed = null }: FacilityWizardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const createMutation = useCreateFacility();
  const updateMutation = useUpdateFacility();

  const [draft, setDraft] = useState<Partial<CreateFacilityInput>>(initialDraft);
  const [activeIndex, setActiveIndex] = useState(0);

  const kind = draft.kind ?? 'club';
  const isSubmitting = editId ? updateMutation.isPending : createMutation.isPending;

  const stepKeys = useMemo<StepKey[]>(() => {
    const keys: StepKey[] = ['owner', 'basics', 'location', 'details'];
    if (kind === 'club') keys.push('courts');
    keys.push('media');
    return keys;
  }, [kind]);
  const steps = useMemo(
    () => stepKeys.map((key) => ({ key, label: t(`facility.wizard.steps.${key}`) })),
    [stepKeys, t],
  );
  const activeKey = stepKeys[Math.min(activeIndex, stepKeys.length - 1)];

  const goToStep = (patch: Partial<CreateFacilityInput>, index: number) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setActiveIndex(index);
  };
  const next = (patch: Partial<CreateFacilityInput>) => goToStep(patch, activeIndex + 1);
  const back = (patch: Partial<CreateFacilityInput>) => goToStep(patch, activeIndex - 1);

  /** Step 1 merge — switching kind keeps shared fields but drops kind-specific ones. */
  const applyOwnerAndType = (patch: Partial<CreateFacilityInput>) => {
    setDraft((prev) => {
      const kindChanged =
        prev.kind !== undefined && patch.kind !== undefined && prev.kind !== patch.kind;
      const nextDraft: Partial<CreateFacilityInput> = { ...prev, ...patch };
      if (kindChanged) {
        for (const field of KIND_SPECIFIC_FIELDS) delete nextDraft[field];
        if (patch.kind === 'pitch' && nextDraft.sports && nextDraft.sports.length > 1) {
          nextDraft.sports = [nextDraft.sports[0]];
        }
      }
      return nextDraft;
    });
    setActiveIndex((index) => index + 1);
  };

  /** Final step — compose the full input from the validated draft and create/update. */
  const submitFacility = (patch: Partial<CreateFacilityInput>) => {
    const merged = { ...draft, ...patch };
    if (
      !merged.ownerId ||
      !merged.kind ||
      !merged.name ||
      !merged.location ||
      !merged.sports?.length ||
      !merged.images?.length
    ) {
      return;
    }
    const input: CreateFacilityInput = {
      ownerId: merged.ownerId,
      kind: merged.kind,
      name: merged.name,
      description: merged.description,
      sports: merged.sports,
      contactPhone: merged.contactPhone,
      location: merged.location,
      workingHours: merged.workingHours,
      courts: merged.courts,
      pricePerHour: merged.pricePerHour,
      capacity: merged.capacity,
      specs: merged.specs,
      cancelPolicy: merged.cancelPolicy,
      images: merged.images,
      documents: merged.documents,
    };
    const onSuccess = (facility: Facility) =>
      navigate(`${PATHS.facilityManagement}/${facility.id}`);
    if (editId) {
      updateMutation.mutate({ id: editId, input }, { onSuccess });
    } else {
      createMutation.mutate(input, { onSuccess });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={editId ? t('facility.wizard.editTitle') : t('facility.wizard.title')}
        subtitle={editId ? t('facility.wizard.editSubtitle') : t('facility.wizard.subtitle')}
        showBack
        backLabel={t('common.back')}
      />

      {regionSeed && (
        <div className={styles.regionSeed} data-testid="wizard-region-seed">
          <span className={styles.regionSeedIcon} aria-hidden>
            <MapPinIcon />
          </span>
          <div className={styles.regionSeedText}>
            <span className={styles.regionSeedTitle}>
              {t('facility.wizard.regionSeed.title', { region: regionSeed.name })}
            </span>
            <span className={styles.regionSeedHint}>{t('facility.wizard.regionSeed.hint')}</span>
          </div>
        </div>
      )}

      <div className={styles.stepperWrap}>
        <Stepper steps={steps} activeIndex={activeIndex} aria-label={t('facility.wizard.title')} />
      </div>

      <motion.section
        key={activeIndex}
        className={styles.panel}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        data-testid="wizard-panel"
      >
        {activeKey === 'owner' && <Step1OwnerType draft={draft} onNext={applyOwnerAndType} />}
        {activeKey === 'basics' && (
          <Step2Basics draft={draft} kind={kind} onBack={back} onNext={next} />
        )}
        {activeKey === 'location' && (
          <Step3Location draft={draft} regionSeed={regionSeed} onBack={back} onNext={next} />
        )}
        {activeKey === 'details' && (
          <Step4Details draft={draft} kind={kind} onBack={back} onNext={next} />
        )}
        {activeKey === 'courts' && <StepCourts draft={draft} onBack={back} onNext={next} />}
        {activeKey === 'media' && (
          <Step5Media
            draft={draft}
            isSubmitting={isSubmitting}
            submitLabel={editId ? t('facility.wizard.save') : t('facility.wizard.create')}
            onBack={back}
            onNext={submitFacility}
          />
        )}
      </motion.section>
    </PageContainer>
  );
}
