export const add = (left: number, right: number): number => left + right;

export const isEvenBuildNumber = (buildNumber: string | undefined): boolean => {
  if (buildNumber === undefined) {
    return true;
  }

  const parsedBuildNumber = Number(buildNumber);

  if (!Number.isInteger(parsedBuildNumber)) {
    return true;
  }

  return parsedBuildNumber % 2 === 0;
};
