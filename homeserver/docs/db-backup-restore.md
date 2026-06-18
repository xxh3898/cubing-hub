# DB와 이미지 백업/복구

## 백업 대상

- MySQL dump
- 게시글 이미지 디렉터리
- backup manifest

Redis는 refresh token, blacklist, 이메일 인증 임시 상태, 랭킹 읽기 모델 성격이므로 영속 기준 데이터로 보지 않는다. 다만 Redis AOF volume은 재시작 안정성을 위해 유지한다.

## 기본 위치

```text
~/backups/cubing-hub/
~/cubing-hub-runtime/post-images/
```

## 일관성 정책

DB에는 `post_attachments.image_url`과 `object_key`가 저장된다. DB dump에는 이미지 메타데이터가 있는데 파일 백업에 해당 이미지가 없으면 복구 후 게시글 이미지가 깨진다.

백업 스크립트는 아래 정책을 지켜야 한다.

- DB dump와 이미지 디렉터리 백업을 같은 backup run으로 묶는다.
- DB dump만 성공하거나 이미지 파일 백업만 성공한 partial backup은 실패로 처리한다.
- backup manifest에 DB dump 파일, 이미지 snapshot 경로, 생성 시각, image file count를 기록한다.
- 복구 검증에서 DB attachment metadata와 파일 존재 여부를 대조한다.

## 복구 검증

1. 별도 테스트 volume에 MySQL dump를 복구한다.
2. 이미지 snapshot을 테스트 이미지 디렉터리에 복사한다.
3. app을 `validate`로 기동한다.
4. 게시글 상세에서 이미지 URL이 `/uploads/`로 응답하는지 확인한다.
5. DB attachment metadata가 가리키는 파일이 이미지 디렉터리에 존재하는지 확인한다.

## 금지 사항

- `docker compose down -v`를 백업이나 rollback 명령으로 사용하지 않는다.
- 백업 검증 전 AWS 리소스를 중단하지 않는다.
- secret 값을 backup manifest에 기록하지 않는다.
