import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ReasonDialog,
  DocumentViewerModal,
  InboxIcon,
  ImageIcon,
  DocumentIcon,
  EyeIcon,
  CheckIcon,
  XIcon,
  RotateCcwIcon,
} from '@ui';
import { facilityDocBadgeVariant, type FacilityDocument } from '../api/facility.types';
import { useFacilityDocumentReview } from '../hooks/useFacilityDocumentReview';
import styles from './FacilityDocumentsCard.module.css';

interface Props {
  facilityId: string;
  documents: FacilityDocument[];
}

/**
 * The facility's verification documents — view each (image/PDF) and accept/reject
 * with a reason, exactly like the owner KYC documents. Only a document still under
 * review shows the loud accept/reject pair; a decided document reverses behind a
 * quiet "change decision" control (accepted → reject with a reason, rejected →
 * accept, confirmed).
 */
export function FacilityDocumentsCard({ facilityId, documents }: Props) {
  const { t } = useTranslation();
  const review = useFacilityDocumentReview();
  const [viewing, setViewing] = useState<FacilityDocument | null>(null);
  const [rejecting, setRejecting] = useState<FacilityDocument | null>(null);
  const [accepting, setAccepting] = useState<FacilityDocument | null>(null);

  const accept = (document: FacilityDocument) =>
    review.mutate({ id: facilityId, documentId: document.id, action: 'accept' });

  const confirmReject = (reason: string) => {
    if (!rejecting) return;
    review.mutate(
      { id: facilityId, documentId: rejecting.id, action: 'reject', reason },
      { onSuccess: () => setRejecting(null) },
    );
  };

  const confirmAccept = () => {
    if (!accepting) return;
    review.mutate(
      { id: facilityId, documentId: accepting.id, action: 'accept' },
      { onSuccess: () => setAccepting(null) },
    );
  };

  // An already-decided document is reversed behind a quiet "change decision"
  // control instead of a loud opposite-action button: accepted → reject (with a
  // reason), rejected → accept (confirmed). Only `pending` shows the pair.
  const changeDecision = (document: FacilityDocument) =>
    document.status === 'approved' ? setRejecting(document) : setAccepting(document);

  return (
    <Card className={styles.card} data-testid="facility-detail-documents">
      <h2 className={styles.title}>{t('facility.doc.title')}</h2>

      {documents.length === 0 ? (
        <EmptyState icon={<InboxIcon />} title={t('facility.doc.noDocuments')} />
      ) : (
        <ul className={styles.docs}>
          {documents.map((document) => (
            <li key={document.id} className={styles.doc}>
              <span className={styles.docIcon} aria-hidden>
                {document.kind === 'image' ? <ImageIcon /> : <DocumentIcon />}
              </span>
              <span className={styles.docMeta}>
                <span className={styles.docHead}>
                  {/* `name` is the endpoint's `docType` slug ('ownership_proof').
                      Translated through the shared owner.doc.type labels — the
                      same five types — falling back to the raw value for a
                      one-off name that has no key. */}
                  <span className={styles.docName}>
                    {t(`owner.doc.type.${document.name}`, { defaultValue: document.name })}
                  </span>
                  <Badge variant={facilityDocBadgeVariant(document.status)} size="sm">
                    {t(`facility.doc.status.${document.status}`)}
                  </Badge>
                </span>
                {document.status === 'rejected' && document.rejectionReason && (
                  <span className={styles.docReason}>“{document.rejectionReason}”</span>
                )}
              </span>
              <span className={styles.docActions}>
                {document.url && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<EyeIcon />}
                    onClick={() => setViewing(document)}
                    data-testid={`facility-doc-view-${document.id}`}
                  >
                    {t('facility.doc.view')}
                  </Button>
                )}
                {document.status === 'pending' ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<CheckIcon />}
                      onClick={() => accept(document)}
                      disabled={review.isPending}
                      data-testid={`facility-doc-accept-${document.id}`}
                    >
                      {t('facility.doc.accept')}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<XIcon />}
                      onClick={() => setRejecting(document)}
                      data-testid={`facility-doc-reject-${document.id}`}
                    >
                      {t('facility.doc.reject')}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<RotateCcwIcon />}
                    onClick={() => changeDecision(document)}
                    disabled={review.isPending}
                    data-testid={`facility-doc-change-${document.id}`}
                  >
                    {t('facility.doc.change')}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <DocumentViewerModal
        isOpen={viewing !== null}
        onClose={() => setViewing(null)}
        url={viewing?.url}
        kind={viewing?.kind ?? 'pdf'}
        title={viewing?.name}
        closeLabel={t('common.close')}
        openLabel={t('facility.doc.openTab')}
        emptyLabel={t('facility.doc.noPreview')}
        fallbackNote={t('facility.doc.pdfHint')}
        errorLabel={t('common.docLoadError')}
      />

      <ReasonDialog
        isOpen={rejecting !== null}
        onClose={() => setRejecting(null)}
        onConfirm={confirmReject}
        title={t('facility.doc.rejectTitle')}
        description={
          rejecting ? t('facility.doc.rejectMessage', { name: rejecting.name }) : undefined
        }
        reasonLabel={t('facility.doc.reasonLabel')}
        reasonPlaceholder={t('facility.doc.reasonPlaceholder')}
        confirmText={t('facility.doc.reject')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={review.isPending}
      />

      <ConfirmDialog
        isOpen={accepting !== null}
        onClose={() => setAccepting(null)}
        onConfirm={confirmAccept}
        title={t('facility.doc.acceptTitle')}
        message={accepting ? t('facility.doc.acceptMessage', { name: accepting.name }) : undefined}
        confirmText={t('facility.doc.accept')}
        cancelText={t('common.cancel')}
        variant="primary"
        isLoading={review.isPending}
      />
    </Card>
  );
}
